import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { NextResponse, NextRequest } = require("next/server");

export { NextResponse, NextRequest };
