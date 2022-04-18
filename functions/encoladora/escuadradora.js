const functions = require("firebase-functions");
const config = require("../fire_config");
const ordenActivaRef = config.db.collection("ordenActiva_test").doc("escuadradora");
const resumenDiasCollectionRef = config.db.collection("resumen_test/escuadradora/resumenDias");
const resumenHorasCollectionRef = config.db.collection("resumen_test/escuadradora/resumenHoras");
const resumenMinutosCollectionRef = config.db.collection("resumen_test/escuadradora/resumenMinutos");
const parosCollectionRef2 = config.db.collection("paros_test/escuadradora/OFs");


var moment = require('moment-timezone');
const { firestore } = require("firebase-admin");
moment.tz.setDefault("America/Guayaquil");
// const ordenesCollectionRef = config.db.collection("ordenes/escuadradora");



// exports.prueba = functions.firestore.document("resumen/escuadradora/resumenHoras/{documentId}").onCreate((snaphot, context) => {
//     const oee = snaphot.data().oee
//     console.log(oee);
//     const oeeN = oee + 10;
//     return snaphot.ref.set({ oeeN }, { merge: true });
// });


exports.prueba = functions.firestore.document("ordenes_test/escuadradora").onUpdate((snaphot, context) => {
    try {
        const orden = snaphot.before.data()
        const taza = orden.taza
        const fechaInicio = moment(orden.fechaInicio)
        const fechaFin = moment(orden.fechaFin)
        const now = moment()
        //compara si la fecha de hoy esta entre la fecha de inicio y fin de la orden actual
        const timeCompare = now > fechaInicio && now < fechaFin
        let ordenActiva = config.admin.firestore().doc("/ordenActiva_test/escuadradora");
        if (timeCompare) {
            let ordenSeg = config.db.collection("/ordenesSegmentadas_test/escuadradora/ordenes").doc(moment().format("yyyMMDD"));
            const ordenObj = {
                id: orden.id,
                taza,
                fechaInicio: moment().set(
                    {
                        hour: moment(orden.fechaInicio).hour(),
                        minute: moment(orden.fechaInicio).minute(),
                        second: moment(orden.fechaInicio).second()
                    }
                ).format("yyyy-MM-DD HH:mm:ss"),
                fechaFin: moment().set(
                    {
                        hour: moment(orden.fechaFin).hour(),
                        minute: moment(orden.fechaFin).minute(),
                        second: moment(orden.fechaFin).second()
                    }).format("yyyy-MM-DD HH:mm:ss")
            }
            ordenSeg.set(ordenObj);
            let ordActiva = { ...ordenObj }
            ordActiva.id = moment().format("yyyMMDD");
            ordenActiva.set({ ...ordActiva, activa: true })
        } else {
            ordenActiva.set({ activa: false })
        }
        return null;

    } catch (error) {
        console.log(error)
        return null;
    }

});

exports.finalizarOrden = functions.firestore.document("ordenActiva_test/escuadradora").onUpdate(async (snapshot, context) => {
    const estado = snapshot.after.data().activa
    const now = moment().format("yyyy-MM-DD HH:mm:ss")
    console.log(now)
    if (!estado) {
        const minutoAnteriorSnap = await resumenMinutosCollectionRef.where("hora", "<", now).
            orderBy("hora", "desc").limit(1).get()
        const minutoAnteriorData = minutoAnteriorSnap.docs[0]?.data()
        console.log(minutoAnteriorData)

        if (minutoAnteriorData?.pulsos > 1) {

            const idResumenAnterior = moment(minutoAnteriorData.hora).format("yyyyMMDDHH")
            let resumenAnterior = await config.admin.firestore().doc(`/resumen_test/escuadradora/resumenHoras/${idResumenAnterior}`).get();
            let pulsos = resumenAnterior.data().pulsos + minutoAnteriorData.pulsos - 1;
            let tiempoUso = (resumenAnterior.data().tiempoUso ? resumenAnterior.data().tiempoUso : 0) +
                (minutoAnteriorData.tiempoUso ? minutoAnteriorData.tiempoUso : 0)
            let tiempoParo = (resumenAnterior.data().tiempoParo ? resumenAnterior.data().tiempoParo : 0) +
                (minutoAnteriorData.tiempoParo ? minutoAnteriorData.tiempoParo : 0)
            resumenAnterior.ref.update({
                pulsos: pulsos,
                tiempoUso: tiempoUso,
                tiempoParo: tiempoParo

            })
            const idResumenDia = moment(minutoAnteriorData.hora).format("yyyyMMDD")
            let resumenAnterior2 = await config.admin.firestore().doc(`/resumen_test/escuadradora/resumenDias/${idResumenDia}`).get();
            resumenAnterior2.ref.update({
                pulsos: resumenAnterior2.data().pulsos + pulsos - 1,
                tiempoUso: (resumenAnterior2.data().tiempoUso ? resumenAnterior2.data().tiempoUso : 0) + tiempoUso,
                tiempoParo: (resumenAnterior2.data().tiempoParo ? resumenAnterior2.data().tiempoParo : 0) + tiempoParo
            })

        }



    } else {
        console.log("no finalizada")

    }
    return null;
})

exports.CrearResumenMinutos = functions.firestore.document("pulsosEsc/{documentId}").onCreate(async (snaphot, context) => {
    try {
        console.log(moment().format("yyyy-MM-DD HH:mm:ss"));

        const pulso = snaphot.data()
        const idResumenMinuto = moment(pulso.hora).format("yyyyMMDDHHmm")
        const ordenActiva = await ordenActivaRef.get()
        if (ordenActiva?.data().activa) {
            let resumenActual = await config.admin.firestore().doc(`/resumen_test/escuadradora/resumenMinutos/${idResumenMinuto}`).get();
            if (resumenActual.data()) {

                resumenActual.ref.update({
                    pulsos: resumenActual.data().pulsos + 1
                })
            } else {
                console.log("nuevo")
                let resumen = resumenMinutosCollectionRef.doc(idResumenMinuto)
                resumen.set({
                    hora: pulso.hora,
                    pulsos: 1
                })
            }
        }
        return null;
    } catch (error) {
        console.log(error)
        return null;
    }

});

exports.CrearResumenHoras = functions.firestore.document("resumen_test/escuadradora/resumenMinutos/{documentId}").onCreate(async (snaphot, context) => {
    try {
        const resumenMinuto = snaphot.data()
        const idResumenHora = moment(resumenMinuto.hora).format("yyyyMMDDHH")
        let resumenActual = await config.admin.firestore().doc(`/resumen_test/escuadradora/resumenHoras/${idResumenHora}`).get();
        const minutoAnteriorSnap = await resumenMinutosCollectionRef.where("hora", "<", resumenMinuto.hora).orderBy("hora", "desc").limit(1).get()
        const minutoAnteriorData = minutoAnteriorSnap.docs[0]?.data()
        if (resumenActual.data()) {
            console.log("existe hora")
            resumenActual.ref.update({
                pulsos: resumenActual.data().pulsos + minutoAnteriorData.pulsos,
                tiempoUso: (resumenActual.data().tiempoUso ? resumenActual.data().tiempoUso : 0) + (minutoAnteriorData.tiempoUso ? minutoAnteriorData.tiempoUso : 0),
                tiempoParo: (resumenActual.data().tiempoParo ? resumenActual.data().tiempoParo : 0) + (minutoAnteriorData.tiempoParo ? minutoAnteriorData.tiempoParo : 0)

            })
        } else {
            console.log("nuevo hora")
            //aqui debe haber condicion si el minuto anterior pertenece al mismo dia, caso contrario no debe hacer nada

            if (minutoAnteriorData?.pulsos > 1) {
                const idResumenAnterior = moment(minutoAnteriorData.hora).format("yyyyMMDDHH")
                const idResumenAnterior2 = moment(minutoAnteriorData.hora).format("yyyyMMDD")

                if (idResumenAnterior2 == moment().format("yyyyMMDD")) {

                    let resumenAnterior = await config.admin.firestore().doc(`/resumen_test/escuadradora/resumenHoras/${idResumenAnterior}`).get();
                    resumenAnterior.ref.update({
                        pulsos: resumenAnterior.data().pulsos + minutoAnteriorData.pulsos - 1,
                        tiempoUso: (resumenAnterior.data().tiempoUso ? resumenAnterior.data().tiempoUso : 0) + (minutoAnteriorData.tiempoUso ? minutoAnteriorData.tiempoUso : 0),
                        tiempoParo: (resumenAnterior.data().tiempoParo ? resumenAnterior.data().tiempoParo : 0) + (minutoAnteriorData.tiempoParo ? minutoAnteriorData.tiempoParo : 0)

                    })
                }

            }

            let resumen = resumenHorasCollectionRef.doc(idResumenHora)
            resumen.set({
                fechaInicio: moment(resumenMinuto.hora).set({ minute: 0, second: 0 }).format("yyyy-MM-DD HH:mm:ss"),
                fechaFin: moment(resumenMinuto.hora).set({ hour: moment(resumenMinuto.hora).hour() + 1, minute: 0, second: 0 }).format("yyyy-MM-DD HH:mm:ss"),
                pulsos: 1
            })
        }
        return null;
    } catch (error) {
        console.log(error)
        return null;
    }

});

exports.CrearResumenDias = functions.firestore.document("resumen_test/escuadradora/resumenHoras/{documentId}").onCreate(async (snaphot, context) => {
    try {
        const resumenHora = snaphot.data()
        const idResumenDia = moment(resumenHora.fechaInicio).format("yyyyMMDD")
        let resumenActual = await config.admin.firestore().doc(`/resumen_test/escuadradora/resumenDias/${idResumenDia}`).get();
        const horaAnteriorSnap = await resumenHorasCollectionRef.where("fechaInicio", "<", resumenHora.fechaInicio).orderBy("fechaInicio", "desc").limit(1).get()
        const horaAnteriorData = horaAnteriorSnap.docs[0]?.data()
        if (resumenActual.data()) {
            console.log("existe dia")
            resumenActual.ref.update({
                pulsos: resumenActual.data().pulsos + horaAnteriorData.pulsos,
                tiempoUso: (resumenActual.data().tiempoUso ? resumenActual.data().tiempoUso : 0) + (horaAnteriorData.tiempoUso ? horaAnteriorData.tiempoUso : 0),
                tiempoParo: (resumenActual.data().tiempoParo ? resumenActual.data().tiempoParo : 0) + (horaAnteriorData.tiempoParo ? horaAnteriorData.tiempoParo : 0)

            })
        } else {
            console.log("nuevo dia")
            //aqui debe haber condicion si el hora anterior pertenece al mismo dia, caso contrario no debe hacer nada
            horaAnteriorSnap.docs[0].id
            if (horaAnteriorData?.pulsos > 1) {
                const idResumenAnterior = moment(horaAnteriorData.fechaInicio).format("yyyyMMDD")
                if (idResumenAnterior == moment().format("yyyyMMDD")) { //aqui condicion si es de hoy
                    let resumenAnterior = await config.admin.firestore().doc(`/resumen_test/escuadradora/resumenDias/${idResumenAnterior}`).get();
                    if (resumenAnterior.data()) {
                        resumenAnterior.ref.update({
                            pulsos: resumenAnterior.data().pulsos + horaAnteriorData.pulsos - 1,
                            tiempoUso: (resumenAnterior.data().tiempoUso ? resumenAnterior.data().tiempoUso : 0) + (horaAnteriorData.tiempoUso ? horaAnteriorData.tiempoUso : 0),
                            tiempoParo: (resumenAnterior.data().tiempoParo ? resumenAnterior.data().tiempoParo : 0) + (horaAnteriorData.tiempoParo ? horaAnteriorData.tiempoParo : 0)

                        })
                    }
                }


            }
            let resumen = resumenDiasCollectionRef.doc(idResumenDia)
            resumen.set({
                fechaInicio: moment(resumenHora.fechaInicio).set({ hour: 0, minute: 0, second: 0 }).format("yyyy-MM-DD HH:mm:ss"),
                fechaFin: moment(resumenHora.fechaInicio).set({ hour: 23, minute: 59, second: 59 }).format("yyyy-MM-DD HH:mm:ss"),
                pulsos: 1
            })
        }
        return null;
    } catch (error) {
        console.log(error)
        return null;
    }

});

exports.crearParos = functions.firestore.document("pulsosEsc/{documentId}").onCreate(async (snaphot, context) => {
    try {
        const pulso = snaphot.data()
        const ordenActivaSnap = await ordenActivaRef.get()
        const ordenActiva = ordenActivaSnap.data()
        if (ordenActiva?.activa) {
            console.log("entro activa")
            const idParo = moment(ordenActiva.fechaInicio).format("yyyyMMDDHHmmss")
            let paro = parosCollectionRef2.doc(ordenActiva.id).collection("paros").doc(idParo)
            const paroAnteriorSnap = await parosCollectionRef2.doc(ordenActiva.id).
                collection("paros").where("fechaFin", "<=", snaphot.data().hora).
                orderBy("fechaFin", "desc").limit(1).get();
            const paroAnterior = paroAnteriorSnap.docs[0]?.data()
            console.log("paro anterior", paroAnterior)
            let tipo = "uso";
            let diff;
            if (!paroAnterior) {
                let horaInicio = moment(ordenActiva.fechaInicio);
                let horaFin = moment(snaphot.data().hora);
                diff = horaFin.diff(horaInicio, "seconds")
                if (ordenActiva.taza < diff) {
                    tipo = "paro"
                }
                paro.set({
                    fechaInicio: ordenActiva.fechaInicio,
                    fechaFin: snaphot.data().hora,
                    tipo,
                    id: idParo,
                    nombreParo: "",
                    descripcion: "",
                    comentario: ""
                })
            } else {
                console.log("entro anterior")

                const idParoAnterior = moment(paroAnterior.fechaInicio).format("yyyyMMDDHHmmss")
                let paroAnteriorObj = await parosCollectionRef2.doc(ordenActiva.id).
                    collection("paros").doc(idParoAnterior).get()
                let horaInicio = moment(paroAnteriorObj.data().fechaFin);
                let horaFin = moment(snaphot.data().hora);
                diff = horaFin.diff(horaInicio, "seconds")
                if (ordenActiva.taza < diff) {
                    tipo = "paro"
                }
                if (paroAnterior.tipo == "uso" && tipo == "uso") {
                    paroAnteriorObj.ref.update({
                        fechaFin: snaphot.data().hora
                    })
                } else {
                    const idParoNuevo = moment(paroAnteriorObj.data().fechaFin).format("yyyyMMDDHHmmss")
                    let paroNuevo = parosCollectionRef2.doc(ordenActiva.id).collection("paros").doc(idParoNuevo)
                    paroNuevo.set({
                        fechaInicio: paroAnteriorObj.data().fechaFin,
                        fechaFin: snaphot.data().hora,
                        tipo,
                        id: idParoNuevo,
                        nombreParo: "",
                        descripcion: "",
                        comentario: ""
                    })
                }
            }

        } else {
            console.log("No existe orden activa")
        }

    } catch (error) {
        console.log(error)
        return null;
    }
});


exports.crearResumenTiemposC = functions.firestore.document("paros_test/escuadradora/OFs/{documentId2}/paros/{documentId}").onCreate(async (snaphot, context) => {
    try {
        console.log("crrate")
        const paro = snaphot.data();
        const idParoM = moment(paro.fechaFin).format("yyyyMMDDHHmm")
        const resumenMinutosSnap = await resumenMinutosCollectionRef.doc(idParoM).get()
        let diff;
        let horaInicio = moment(paro.fechaInicio);
        let horaFin = moment(paro.fechaFin);
        diff = horaFin.diff(horaInicio, "seconds")
        if (resumenMinutosSnap.data()) {
            if (paro.tipo == "uso") {
                resumenMinutosSnap.ref.update({
                    tiempoUso: (resumenMinutosSnap.data().tiempoUso ? resumenMinutosSnap.data().tiempoUso : 0) + diff
                })
            } else {
                resumenMinutosSnap.ref.update({
                    tiempoParo: (resumenMinutosSnap.data().tiempoParo ? resumenMinutosSnap.data().tiempoParo : 0) + diff
                })
            }
        }
    } catch (error) {
        console.log(error)
        return null;
    }
});

exports.crearResumenTiemposU = functions.firestore.document("paros_test/escuadradora/OFs/{documentId2}/paros/{documentId}").onUpdate(async (snaphot, context) => {
    try {
        console.log("update")

        const paroAntes = snaphot.before.data();
        const paroDespues = snaphot.after.data();
        const idParoM = moment(paroAntes.fechaFin).format("yyyyMMDDHHmm")
        const resumenMinutosSnap = await resumenMinutosCollectionRef.doc(idParoM).get()
        let horaInicio = moment(paroAntes.fechaFin);
        let horaFin = moment(paroDespues.fechaFin);
        let diff = horaFin.diff(horaInicio, "seconds");

        if (resumenMinutosSnap.data()) {
            resumenMinutosSnap.ref.update({
                tiempoUso: (resumenMinutosSnap.data().tiempoUso ? resumenMinutosSnap.data().tiempoUso : 0) + diff
            })
        }
    } catch (error) {
        console.log(error)
        return null;
    }
})