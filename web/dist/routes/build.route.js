"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const build_controller_1 = __importDefault(require("../controllers/build.controller"));
const router = express_1.default.Router();
router.post('/', build_controller_1.default.createBuild); // Create new build
router.get("/:id/download", build_controller_1.default.downloadBuild); // Download .exe file
router.get("/:id/status", build_controller_1.default.getBuildStatus); // Get status of BUILD from an ID
exports.default = router;
