#!/usr/bin/env node

import { spawn } from 'child_process';
import { getState } from '../lib/bspc.js';

const appIcons = {
    "firefox": "",
    "Gimp-2.10": "",
    "Slippi Launcher": "",
    ".slippi-netplay-wrapped": "",
    "obs": "",
    "Code": "󰨞",
    "kitty": "",
    "Alacritty": "",
    "discord": "󰙯",
    "Thunar": "",
    "neovide": "",
    "glrnvim": "",
    "vlc": "󰕼"
};

const defaultAppIcon = '󰣆';

const getAppIcon = (
    (client) => appIcons[(client && client.className)] || defaultAppIcon
);

const wrapAction = (cmd) => (str) => !cmd ? str : `%{A1:${cmd}:}${str}%{A}`;
const wrapFore = (clr) => (str) => !clr ? str : `%{F${clr}}${str}%{F-}`;
const wrapBack = (clr) => (str) => !clr ? str : `%{B${clr}}${str}%{B-}`;
const wrapOver  = (clr) => (str) => !clr ? str : `%{o${clr}}%{+o}${str}%{-o}`;
const wrapUnder = (clr) => (str) => !clr ? str : `%{u${clr}}%{+u}${str}%{-u}`;
const wrapBoth = (clr) => (str) => wrapUnder(clr)(wrapOver(clr)(str));

const getPolybarMonitors = () => new Promise((fin, err) => {
    let monitorsStr = "";
    const proc = spawn('polybar', ['--list-monitors']);
    proc.stdout.on('data', (data) => { monitorsStr += (`${data}`); });
    proc.on('close', () => {
        fin(monitorsStr.trim().split('\n').map((str) => str.split(":")[0]));
    });
});

const getPolybarPids = () => new Promise((fin) => {
    let psStr = "";
    const proc = spawn('ps', ['-e']);
    proc.stdout.on('data', (data) => { psStr += (`${data}`); });
    proc.on('close', () => {
        const processes = psStr.trim().split('\n').map((str) => str.trim());
        const pids = processes
            .filter((str) => str.endsWith('polybar'))
            .map((str) => str.split(/\s/)[0])
            .filter((pid) => pid !== `${proc.pid}`);
        fin(pids);
    });
});

const sendPayload = (pid, payload) => new Promise((fin) => {
    const proc = spawn(
        'polybar-msg', ['-p', pid, 'action', 'dzbspwm', 'send', `${payload}`]
    );
    proc.on('close', () => { fin(); });
});

const main = async () => {
    const [
        { desktopsByName },
        polybarMonitors,
        polybarPids
    ] = await Promise.all([
        getState(),
        getPolybarMonitors(),
        getPolybarPids(),
    ]);
    const payloads = polybarMonitors.map(() => "");
    for (let i=1; i<=10; i++) {
        const desktop = desktopsByName[i];
        if (!desktop || desktop.isHidden) { continue }
        if (!(desktop.hasClient || desktop.isActive)) { continue; }
        let desktopString = "";
        let hasClient = false;
        const processNode = (node) => {
            if (!node) { return; }
            processNode(node.firstChild);
            if (node.client) {
                hasClient = true;
                const fore = node.client.isFocused ? '#ffffff' : '#aaffffff';
                const appIcon = getAppIcon(node.client);
                desktopString += wrapFore(fore)(appIcon) + " ";
            }
            processNode(node.secondChild);
        };
        processNode(desktop.root);
        desktopString = `${i}` + (hasClient ? `${desktopString.trim()}` : '');
        desktopString = " " + desktopString + " ";
        polybarMonitors.forEach((monitorName, monitorInd) => {
            const isThis = desktop.monitorName === monitorName;
            const action = `bspwm-focus-desktop.js ${i}`;
            const fore = desktop.isActive ? '#e0def4' : '#6e6a86';
            const back = desktop.isFocused && '#aa403d52';
            const under = desktop.isActive && (
                isThis ? '#c4a7e7' : '#6e6a86'
            );
            const monitorString = wrapAction(action)(
                wrapBack(back)(wrapFore(fore)(wrapBoth(under)(desktopString)))
            );
            payloads[monitorInd] += monitorString + " ";
        });
    }
    await Promise.all(payloads.map((payload, ind) => (
        sendPayload(polybarPids[ind], payload.trim())
    )));
};

main();
