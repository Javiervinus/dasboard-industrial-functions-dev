const functions = require("firebase-functions");
const encoladora = require('./encoladora/encoladora');


// exports.prueba = encoladora.prueba;
exports.prueba2 = encoladora.prueba;
exports.CrearResumenMinutos = encoladora.CrearResumenMinutos;
exports.CrearResumenHoras = encoladora.CrearResumenHoras
exports.CrearResumenDias = encoladora.CrearResumenDias
//paros
exports.CrearParos = encoladora.crearParos;


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
