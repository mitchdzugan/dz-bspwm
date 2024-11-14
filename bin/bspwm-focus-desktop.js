#!/usr/bin/env node

import { bspc, getState } from '../lib/bspc.js';

const userTarget = (process.argv[2] || 'f').substring(0, 2);

const main = async () => {
    const {
        desktopsByName,
        focusedMonitor,
        focusedDesktop,
        resolveName,
    } = await getState();
    const target = resolveName(userTarget, false);
    const existing = desktopsByName[target];
    if (!existing) {
        await bspc('monitor', focusedMonitor.id, '-a', target);
    } else if (existing.monitorId !== focusedMonitor.id) {
        if (existing.isActive) {
            await bspc('desktop', target, '-s', 'focused');
        } else {
            await bspc('desktop', target, '-m', focusedMonitor.id);
        }
    }
    if (focusedDesktop.name == target) { return; }
    await bspc('desktop', '-f', target);
};

main();
