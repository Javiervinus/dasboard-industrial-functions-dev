const functions = require("firebase-functions");
const encoladora = require('./encoladora/encoladora');
const escuadradora = require('./encoladora/escuadradora');



// exports.prueba = encoladora.prueba;

exports.ordenes = encoladora.prueba;
exports.CrearResumenMinutos = encoladora.CrearResumenMinutos;
exports.CrearParos = encoladora.crearParos;
exports.CrearResumenHoras = encoladora.CrearResumenHoras
exports.CrearResumenDias = encoladora.CrearResumenDias
exports.crearResumenTiemposC = encoladora.crearResumenTiemposC;
exports.crearResumenTiemposU = encoladora.crearResumenTiemposU;
exports.finalizarOrden = encoladora.finalizarOrden

//escuadradora
exports.ordenesEsc = escuadradora.prueba;
exports.CrearResumenMinutosEsc = escuadradora.CrearResumenMinutos;
exports.CrearParosEsc = escuadradora.crearParos;
exports.CrearResumenHorasEsc = escuadradora.CrearResumenHoras
exports.CrearResumenDiasEsc = escuadradora.CrearResumenDias
exports.crearResumenTiemposCEsc = escuadradora.crearResumenTiemposC;
exports.crearResumenTiemposUEsc = escuadradora.crearResumenTiemposU;
exports.finalizarOrdenEsc = escuadradora.finalizarOrden

//paros


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
