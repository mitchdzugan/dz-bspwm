#!/usr/bin/env node

import { getState } from '../lib/bspc.js';

const main = async () => {
    const state = await getState();
    console.log(state);
};

main();
