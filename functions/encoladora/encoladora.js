const functions = require("firebase-functions");
const config = require("../fire_config");
const ordenActivaRef = config.db.collection("ordenActiva_test").doc("encoladora");
const resumenDiasCollectionRef = config.db.collection("resumen_test/encoladora/resumenDias");
const resumenHorasCollectionRef = config.db.collection("resumen_test/encoladora/resumenHoras");
const resumenMinutosCollectionRef = config.db.collection("resumen_test/encoladora/resumenMinutos");
const parosCollectionRef = config.db.collection("paros_test/encoladora/OFs");


const moment = require("moment");
const { firestore } = require("firebase-admin");

// const ordenesCollectionRef = config.db.collection("ordenes/encoladora");



// exports.prueba = functions.firestore.document("resumen/encoladora/resumenHoras/{documentId}").onCreate((snaphot, context) => {
//     const oee = snaphot.data().oee
//     console.log(oee);
//     const oeeN = oee + 10;
//     return snaphot.ref.set({ oeeN }, { merge: true });
// });


exports.prueba = functions.firestore.document("ordenes_test/encoladora").onUpdate((snaphot, context) => {
    try {
        const orden = snaphot.before.data()
        const taza = orden.taza
        const fechaInicio = moment(orden.fechaInicio)
        const fechaFin = moment(orden.fechaFin)
        const now = moment()
        //compara si la fecha de hoy esta entre la fecha de inicio y fin de la orden actual
        const timeCompare = now > fechaInicio && now < fechaFin
        let ordenActiva = config.admin.firestore().doc("/ordenActiva_test/encoladora");
        if (timeCompare) {
            let ordenSeg = config.db.collection("/ordenesSegmentadas_test/encoladora/ordenes").doc(moment().format("yyyMMDD"));
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
            console.log(ordenObj)
            ordenSeg.set(ordenObj);
            ordenObj.id = moment().format("yyyMMDD");
            ordenActiva.set({ ...ordenObj, activa: true })
        } else {
            ordenActiva.set({ activa: false })
        }
        return null;

    } catch (error) {
        console.log(error)
        return null;
    }

});

exports.finalizarOrden = functions.firestore.document("ordenActiva_test/encoladora").onUpdate((snapshot, context) => {
    const estado = snapshot.after.data().activa
    if (!estado) {
        console.log("finalizada")
    } else {
        console.log("no finalizada")

    }
    return null;
})

exports.CrearResumenMinutos = functions.firestore.document("pulsos/{documentId}").onCreate(async (snaphot, context) => {
    try {
        const pulso = snaphot.data()
        const idResumenMinuto = moment(pulso.hora).format("yyyyMMDDHHmm")
        let resumenActual = await config.admin.firestore().doc(`/resumen_test/encoladora/resumenMinutos/${idResumenMinuto}`).get();
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
        return null;
    } catch (error) {
        console.log(error)
        return null;
    }

});

exports.CrearResumenHoras = functions.firestore.document("resumen_test/encoladora/resumenMinutos/{documentId}").onCreate(async (snaphot, context) => {
    try {
        const resumenMinuto = snaphot.data()
        const idResumenHora = moment(resumenMinuto.hora).format("yyyyMMDDHH")
        let resumenActual = await config.admin.firestore().doc(`/resumen_test/encoladora/resumenHoras/${idResumenHora}`).get();
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
            if (minutoAnteriorData?.pulsos > 1) {
                const idResumenAnterior = moment(minutoAnteriorData.hora).format("yyyyMMDDHH")
                let resumenAnterior = await config.admin.firestore().doc(`/resumen_test/encoladora/resumenHoras/${idResumenAnterior}`).get();
                resumenAnterior.ref.update({
                    pulsos: resumenAnterior.data().pulsos + minutoAnteriorData.pulsos - 1,
                    tiempoUso: (resumenAnterior.data().tiempoUso ? resumenAnterior.data().tiempoUso : 0) + (minutoAnteriorData.tiempoUso ? minutoAnteriorData.tiempoUso : 0),
                    tiempoParo: (resumenAnterior.data().tiempoParo ? resumenAnterior.data().tiempoParo : 0) + (minutoAnteriorData.tiempoParo ? minutoAnteriorData.tiempoParo : 0)

                })

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

exports.CrearResumenDias = functions.firestore.document("resumen_test/encoladora/resumenHoras/{documentId}").onCreate(async (snaphot, context) => {
    try {
        const resumenHora = snaphot.data()
        const idResumenDia = moment(resumenHora.fechaInicio).format("yyyyMMDD")
        let resumenActual = await config.admin.firestore().doc(`/resumen_test/encoladora/resumenDias/${idResumenDia}`).get();
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
            if (horaAnteriorData?.pulsos > 1) {
                const idResumenAnterior = moment(horaAnteriorData.fechaInicio).format("yyyyMMDD")
                let resumenAnterior = await config.admin.firestore().doc(`/resumen_test/encoladora/resumeDias/${idResumenAnterior}`).get();
                resumenAnterior.ref.update({
                    pulsos: resumenAnterior.data().pulsos + horaAnteriorData.pulsos - 1,
                    tiempoUso: (resumenAnterior.data().tiempoUso ? resumenAnterior.data().tiempoUso : 0) + (horaAnteriorData.tiempoUso ? horaAnteriorData.tiempoUso : 0),
                    tiempoParo: (resumenAnterior.data().tiempoParo ? resumenAnterior.data().tiempoParo : 0) + (horaAnteriorData.tiempoParo ? horaAnteriorData.tiempoParo : 0)

                })

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

exports.crearParos = functions.firestore.document("pulsos/{documentId}").onCreate(async (snaphot, context) => {
    try {
        const pulso = snaphot.data()
        const ordenActiva = await ordenActivaRef.get()
        if (ordenActiva) {
            const idParo = moment(ordenActiva.data().fechaInicio).format("yyyyMMDDHHmmss")
            let paro = parosCollectionRef.doc(ordenActiva.data().id).collection("paros").doc(idParo)
            const paroAnteriorSnap = await parosCollectionRef.doc(ordenActiva.data().id).
                collection("paros").where("fechaFin", "<=", snaphot.data().hora).
                orderBy("fechaFin", "desc").limit(1).get();
            const paroAnterior = paroAnteriorSnap.docs[0]?.data()
            let tipo = "uso";
            let diff;
            if (!paroAnterior) {
                let horaInicio = moment(ordenActiva.data().fechaInicio);
                let horaFin = moment(snaphot.data().hora);
                diff = horaFin.diff(horaInicio, "seconds")
                if (ordenActiva.data().taza < diff) {
                    tipo = "paro"
                }
                paro.set({
                    fechaInicio: ordenActiva.data().fechaInicio,
                    fechaFin: snaphot.data().hora,
                    tipo
                })
            } else {
                const idParoAnterior = moment(paroAnterior.fechaInicio).format("yyyyMMDDHHmmss")
                let paroAnteriorObj = await parosCollectionRef.doc(ordenActiva.data().id).
                    collection("paros").doc(idParoAnterior).get()
                let horaInicio = moment(paroAnteriorObj.data().fechaFin);
                let horaFin = moment(snaphot.data().hora);
                diff = horaFin.diff(horaInicio, "seconds")
                if (ordenActiva.data().taza < diff) {
                    tipo = "paro"
                }
                if (paroAnterior.tipo == "uso" && tipo == "uso") {
                    paroAnteriorObj.ref.update({
                        fechaFin: snaphot.data().hora
                    })
                } else {
                    const idParoNuevo = moment(paroAnteriorObj.data().fechaFin).format("yyyyMMDDHHmmss")
                    let paroNuevo = parosCollectionRef.doc(ordenActiva.data().id).collection("paros").doc(idParoNuevo)
                    paroNuevo.set({
                        fechaInicio: paroAnteriorObj.data().fechaFin,
                        fechaFin: snaphot.data().hora,
                        tipo
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

exports.crearResumenTiemposC = functions.firestore.document("paros_test/encoladora/OFs/{documentId2}/paros/{documentId}").onCreate(async (snaphot, context) => {
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

exports.crearResumenTiemposU = functions.firestore.document("paros_test/encoladora/OFs/{documentId2}/paros/{documentId}").onUpdate(async (snaphot, context) => {
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