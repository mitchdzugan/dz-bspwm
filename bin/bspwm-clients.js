#!/usr/bin/env node

import { getState } from '../lib/bspc.js';

const main = async () => {
    const { clients } = await getState();
    const res = {};
    for (const clientId in clients) {
        const { node, ...client } = clients[clientId];
        res[clientId] = { id: clientId, client };
    }
    console.log(JSON.stringify(res));
};

main();
