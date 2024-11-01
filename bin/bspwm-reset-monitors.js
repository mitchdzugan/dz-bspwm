#!/usr/bin/env node

import { bspc, getState } from '../lib/bspc.js';

const names = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const validNames = { hidden: true };
names.forEach((name) => { validNames[name] = true; })

const main = async () => {
    const { 
        desktopsByName, desktops, monitors, tree, hasFocusedClient
    } = await getState();
    const wiredMonitors = tree.filter(({ wired }) => wired);
    const firstWiredMonitorId = wiredMonitors[0].id;
    const lastWiredMonitorId = wiredMonitors[wiredMonitors.length - 1].id;
    const taken = {};
    for (const desktopName in desktopsByName) { taken[desktopName] = true; }
    let nextValidName = 1;
    const getNextName = () => {
        while (taken[nextValidName]) { nextValidName++; }
        return nextValidName;
    };
    for (const desktopId in desktops) {
        const desktopName = desktops[desktopId].name;
        const isWired = monitors[desktops[desktopId].monitorId].wired;
        if (!isWired) {
            await bspc('desktop', desktopName, '-m', lastWiredMonitorId);
        }
        const isValid = !!validNames[desktopName];
        const finalName = isValid ? desktopName : getNextName();
        taken[finalName] = true;
        if (!isValid) {
            await bspc('desktop', desktopName, '-n', finalName);
        }
    }
    for (const monitor of wiredMonitors) {
        const desktops = monitor.desktops || [{ name: 'hidden' }];
        if (desktops.length === 1 && desktops[0].name === 'hidden') {
            const newDesktop = getNextName();
            await bspc('monitor', lastWiredMonitorId, '-a', newDesktop);
            await bspc('desktop', '-a', newDesktop);
        }
    }
    const hasHidden = !!desktopsByName.hidden;
    if (!hasHidden) {
        await bspc('monitor', lastWiredMonitorId, '-a', 'hidden');
    }
    if (!hasFocusedClient) {
        await bspc('monitor', firstWiredMonitorId, '-f');
    }
};

main();
