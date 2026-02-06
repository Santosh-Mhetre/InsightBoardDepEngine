"use strict";
(() => {
var exports = {};
exports.id = 572;
exports.ids = [572];
exports.modules = {

/***/ 473:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ handler)
/* harmony export */ });
const BACKEND = process.env.BACKEND_URL || "https://insightboarddepengine.onrender.com";
async function handler(req, res) {
    const { path } = req.query;
    const backendPath = Array.isArray(path) ? path.join("/") : path;
    const url = `${BACKEND}/${backendPath}`;
    const init = {
        method: req.method,
        headers: {
            "Content-Type": "application/json"
        }
    };
    if (req.body && Object.keys(req.body).length) init.body = JSON.stringify(req.body);
    const r = await fetch(url, init);
    const text = await r.text();
    try {
        return res.status(r.status).json(JSON.parse(text));
    } catch (e) {
        return res.status(r.status).send(text);
    }
}


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__(473));
module.exports = __webpack_exports__;

})();