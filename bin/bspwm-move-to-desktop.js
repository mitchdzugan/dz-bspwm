#!/usr/bin/env node

import { program } from 'commander';
import { bspc, getState } from '../lib/bspc.js';

program
    .option('-c, --client <NODE_SEL>', 'bspwm node to move', 'focused')
    .option('-d, --desktop <name>', 'desktop to move to (_ for hidden, f for fresh)', 'f')
    .option('-s, --stay', 'stay on current desktop (do not follow window', false)
    .parse();

const main = async () => {
    const { desktop, stay, client } = program.opts();
    const { resolveName, focusedClient, desktopsByName } = await getState();
    const toDesktop = resolveName(desktop);
    const nodeSel = client !== 'focused' ? client : focusedClient.node.id;
    if (toDesktop === 'hidden' && !stay) {
        console.error('Cannot follow to hidden desktop');
        process.exit(1);
    }
    if (!desktopsByName[toDesktop]) {
        await bspc('monitor', '-a', toDesktop);
    }
    const rest = stay ? [] : ['--follow'];
    await bspc('node', nodeSel, '-d', toDesktop, ...rest);
};

main();
