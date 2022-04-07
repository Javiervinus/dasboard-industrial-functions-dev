const functions = require("firebase-functions");
const encoladora = require('./encoladora/encoladora');


// exports.prueba = encoladora.prueba;

exports.prueba2 = encoladora.prueba;
exports.CrearResumenMinutos = encoladora.CrearResumenMinutos;
exports.CrearParos = encoladora.crearParos;
exports.CrearResumenHoras = encoladora.CrearResumenHoras
exports.CrearResumenDias = encoladora.CrearResumenDias
exports.crearResumenTiemposC = encoladora.crearResumenTiemposC;
exports.crearResumenTiemposU = encoladora.crearResumenTiemposU;


//paros


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
