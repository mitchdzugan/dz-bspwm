#!/usr/bin/env node

import { bspc, getState } from '../lib/bspc.js';

const names = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const validNames = { hidden: true };
names.forEach((name) => { validNames[name] = true; })

const userTarget = (process.argv[2] || 'f').substring(0, 2);

const main = async () => {
    const { desktopsByName, focusedMonitor } = await getState();
    const taken = {};
    for (const desktopName in desktopsByName) { taken[desktopName] = true; }
    let nextValidName = 1;
    const getNextName = () => {
        while (taken[nextValidName]) { nextValidName++; }
        return `${nextValidName}`;
    };
    const target = validNames[userTarget] ? userTarget : getNextName();
    const existing = desktopsByName[target];
    if (!existing) {
        await bspc('monitor', focusedMonitor.id, '-a', target);
    } else if (existing.monitorId !== focusedMonitor.id) {
        await bspc('desktop', target, '-m', focusedMonitor.id);
    }
    await bspc('desktop', '-f', target);
};

main();
