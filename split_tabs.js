const fs = require('fs');
const path = require('path');

const fileContent = fs.readFileSync('src/app/admin/baileys/BaileysDashboard.jsx', 'utf-8');

const tabsToExtract = [
  'TabStatus', 'TabProfil', 'TabStory', 'TabChat', 'TabGrup', 
  'TabSaluran', 'TabKirim', 'TabBlocklist', 'TabLidMap', 'TabKonteks', 'TabLog'
];

const outDir = 'src/components/baileys';

let updatedDashboard = fileContent;

for (const tab of tabsToExtract) {
  // Use a regex that finds function TabName() { ... } \n}
  // This looks for 'function TabName()' up to the first '}' that is at the start of a line.
  const regex = new RegExp("function " + tab + "\\(\\)[\\s\\S]*?\\n\\}");
  const match = fileContent.match(regex);
  if (match) {
    const block = match[0];
    
    let imports = `"use client";\nimport { useState, useCallback, useEffect, useRef } from "react";\nimport { useApi, apiPost, apiDelete, normalizeJid } from "./api";\nimport { CopyBtn, StatusDot, Alert, QRDisplay } from "./ui";\n\n`;
    
    fs.writeFileSync(path.join(outDir, tab + '.jsx'), imports + "export " + block);
    
    updatedDashboard = updatedDashboard.replace(block, '');
  }
}

// Remove the shared hooks and QRDisplay from Dashboard
// Replace everything between '// ── Shared hooks & helpers' and 'export default function BaileysDashboard'
const mainIdx = updatedDashboard.indexOf('export default function BaileysDashboard');
const sharedIdx = updatedDashboard.indexOf('// ── Shared hooks & helpers');

if (sharedIdx !== -1 && mainIdx !== -1) {
  const codeToRemove = updatedDashboard.substring(sharedIdx, mainIdx);
  updatedDashboard = updatedDashboard.replace(codeToRemove, '');
}

// Insert imports into dashboard
const dashboardImports = `
import { TabStatus } from "@/components/baileys/TabStatus";
import { TabProfil } from "@/components/baileys/TabProfil";
import { TabStory } from "@/components/baileys/TabStory";
import { TabChat } from "@/components/baileys/TabChat";
import { TabGrup } from "@/components/baileys/TabGrup";
import { TabSaluran } from "@/components/baileys/TabSaluran";
import { TabKirim } from "@/components/baileys/TabKirim";
import { TabBlocklist } from "@/components/baileys/TabBlocklist";
import { TabLidMap } from "@/components/baileys/TabLidMap";
import { TabKonteks } from "@/components/baileys/TabKonteks";
import { TabLog } from "@/components/baileys/TabLog";
`;

updatedDashboard = updatedDashboard.replace('import { useEffect, useState, useCallback, useRef } from "react";', 'import { useState } from "react";\n' + dashboardImports);

fs.writeFileSync('src/app/admin/baileys/BaileysDashboard.jsx', updatedDashboard);

console.log("Extraction complete.");
