import { spawn } from "node:child_process";
import { prisma } from "../prisma/prisma";
import path from "node:path";
import fs from "node:fs";

let building = false;

const buildService = async(type: "nsis" | "portable" | "msi",width: number, height: number, minWidth: number, minHeight: number, maxWidth: number, maxHeight: number, resizable: boolean, fullscreen: boolean, hideMenu: boolean, systemButton: boolean, centerWindow: boolean, posX: number, posY: number, alwaysOnTop: boolean, frameless: boolean, backgroundColor: string, title: string, versionWorker: string, nodeIntegration: boolean, contextIsolation: boolean, sandbox: boolean, devtools: boolean, hardwareAccel: boolean, name: string, version: string, description: string, author: string, licence: string, appId: string, startUrl: string, winLink: boolean, authNewWindow: boolean, blockWindowOpen: boolean, authHTTPS: boolean, authHTTP: boolean, authSubdom: boolean, redirectURLUnDom: string, domainBlacklist?: string, domainWhitelist?: string,  chromiumFlags?: string) => {
  try{
    if(building){
      return {success: false, code: 409, error: "No worker available"}
    }

    let resultDb = await prisma.build.create({
      data: {
        type,
        appId,
        name,
        version,
        alwaysOnTop,
        author,
        backgroundColor,
        chromiumFlags,
        contextIsolation,
        description,
        devtools,
        frameless,
        hardwareAccel,
        maxHeight,
        fullscreen,
        height,
        license: licence,
        maxWidth,
        minHeight,
        minWidth,
        nodeIntegration,
        resizable,
        sandbox,
        startUrl,
        title,
        width,
        status: "BUILDING",
        redirectURLUnDom,
        versionWorker,
        authHTTP,
        authHTTPS,
        authNewWindow,
        authSubdom,
        blockWindowOpen,
        centerWindow,
        domainBlacklist,
        domainWhitelist,
        hideMenu,
        posX,
        posY,
        systemButton,
        winLink
      }
    });

    if(!resultDb) throw new Error("Error when pushing in DB")
      
    building = true;
    const worker = spawn("node", ["worker/build.worker.js", resultDb.id], {stdio: "inherit"})

    worker.on("close", (code) => {
      building = false;
      console.log("Build finished with code " + code);
    })

    worker.on("exit", (code) => {
      building = false;
      console.log("Build worker exited with code " + code);
    });
    
    worker.on("error", (error) => {
      building = false;
      console.error(error);
    })

    return {success: true, status: "Building", result: resultDb}
  }catch(error){
    console.error(error);
    return {success: false, code: 500, error}
  }
}

const downloadBuild = async(id: string) => {
  try{
    const build = await prisma.build.findUnique({
      where: {
        id
      }
    });
    
    if(!build) return {success: false, error: "Build not found"};
    if (build.status !== "SUCCESS") return {success: false, error: "Build is not ready", status: build.status};
    if(!build.buildFile) return {success: false, error: "Build file not found"};

    const filePath = path.resolve(build.buildFile);
    if (!fs.existsSync(filePath)) return {success: false, error: "Build file does not exist"};

    return {success: true, filePath}
  }catch(error){
    return {success: false, error}
  }
}

const getStatusBuild = async(id: string) => {
  try{
    let build = await prisma.build.findUnique({
      where: {id}
    });

    if(!build) return {success: false, error: "Build not found"};
    
    let buildStatus = build.status;
    return {success: true, result: buildStatus}
  }catch(error){
    console.error(error);
    return {success: false, error}
  }
}

export default {buildService, downloadBuild, getStatusBuild}