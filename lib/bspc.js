import { spawn } from 'child_process';

const MONITOR_RANKS = ((() => {
    const ORDERED = [
        'eDP-1',
        'VGA-0',
        'HDMI-1',
        'HDMI-0',
    ];
    const res = {};
    ORDERED.forEach((name, ind) => {
        res[name] = ind + 1;
    });
    return res;
})());

const bspcBin = new Promise((fin, err) => {
    let binPath;
    const which = spawn('which', ['bspc']);
    which.stdout.on('data', (data) => { binPath = (`${data}`).trim(); });
    which.on('close', (code) => {
        if (code || !binPath) { err(`Could not find 'bspc' bin`); }
        fin(binPath);
    });
});

const bspc = async(...args) => {
    const bin = await bspcBin;
    return new Promise((fin) => {
        const bspc = spawn(bin, args);
        let out = "";
        bspc.stdout.on('data', (data) => { out += `${data}`; });
        bspc.on('close', () => fin(out.trim()));
    });
};

const query = async(...args) => {
    const res = await bspc('query', ...args);
    return res.split('\n');
};

const tree = async(...args) => {
    const res = await bspc('query', '-T', ...args);
    return JSON.parse(res);
};

const getDesktops = async() => {
    const ids = await query('-D');
    return Promise.all(ids.map((id) => tree('-d', id)));
};

const monitorCompare = (mon1, mon2) => {
    const rank1 = MONITOR_RANKS[mon1];
    const rank2 = MONITOR_RANKS[mon2];
    return rank1 - rank2;
};

const monitorNames = new Promise(async (fin) => {
    const names = await query('-M', '--names');
    names.sort(monitorCompare);
    fin(names);
});

const getMonitors = async() => {
    const mons = await monitorNames;
    return Promise.all(mons.map((mon) => tree('-m', mon)));
};

const getFocusedMonitorName = async() => {
    const queryRes = await query('-M', '--names', '-m', 'focused');
    return queryRes[0];
};

export const getState = async() => {
    const res = {};
    const monitors = await getMonitors();
    const focusedMonitorName = await getFocusedMonitorName();
    res.monitors = {};
    res.desktops = {};
    res.nodes = {};
    res.clients = {};
    for (const monitor of monitors) {
        const { focusedDesktopId, name: monitorName } = monitor;
        monitor.isFocused = monitorName === focusedMonitorName;
        res.monitors[monitorName] = monitor;
        if (monitor.isFocused) {
            res.focusedMonitor = monitor;
        }
        for (const desktop of monitor.desktops) {
            const { focusedNodeId, id: desktopId } = desktop;
            desktop.isActive = desktopId === focusedDesktopId;
            desktop.isFocused = monitor.isFocused && desktop.isActive;
            desktop.monitorName = monitorName;
            desktop.hasNode = false;
            desktop.hasClient = false;
            res.desktops[desktopId] = desktop;
            const processNode = (node) => {
                if (!node) { return; }
                const { id: nodeId, client } = node;
                node.monitorName = monitorName;
                node.desktopId = desktopId;
                node.isActive = nodeId === focusedNodeId;
                node.isFocused = desktop.isFocused && node.isActive;
                desktop.hasNode = true;
                res.nodes[nodeId] = node;
                if (client) {
                    desktop.hasClient = true;
                    client.monitorName = node.monitorName;
                    client.desktopId = node.desktopId;
                    client.isActive = node.isActive;
                    client.isFocused = node.isFocused;
                    client.node = node;
                    res.clients[nodeId] = client;
                }
                processNode(node.firstChild);
                processNode(node.secondChild);
            };
            processNode(desktop.root);
        }
    }
    res.tree = monitors;
    return res;
};