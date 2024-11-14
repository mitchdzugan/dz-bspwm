#!/usr/bin/env node

import { bspc, getState } from '../lib/bspc.js';

const main = async () => {
    const { tree, focusedMonitor } = await getState();
    const startInd = focusedMonitor.ind || 0;
    const nextInd = (curr) => ((curr + 1) % tree.length);
    let ind = nextInd(startInd);
    while (ind !== startInd) {
        if (tree[ind].wired) { break; }
        ind = nextInd(ind);
    }
    await bspc('monitor', tree[ind].id, '-f');
};

main();
