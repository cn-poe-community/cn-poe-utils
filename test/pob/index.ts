import type { GetItemsResult, GetPassiveSkillsResult } from "cn-poe-utils/api";
import { TranslatorFactory } from "cn-poe-utils/translator/zh2en";
import config from "./config.json" with { type: "json" };


const TENCENT_POE_SITE = "https://poe.game.qq.com";

const GET_CHARACTERS_URL = "/character-window/get-characters";
const VIEW_PROFILE_URL = "/account/view-profile";
const GET_ITEMS_URL = "/character-window/get-items";
const GET_PASSIVE_SKILLS_URL = "/character-window/get-passive-skills";

const factory = new TranslatorFactory();
const jsonTranslator = factory.getJsonTranslator();


async function proxy(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (!url.pathname.startsWith(GET_CHARACTERS_URL)
        && !url.pathname.startsWith(VIEW_PROFILE_URL)
        && !url.pathname.startsWith(GET_ITEMS_URL)
        && !url.pathname.startsWith(GET_PASSIVE_SKILLS_URL)) {
        console.error(`Invalid endpoint: ${url.pathname}`);
        return new Response(`Invalid endpoint: ${url.pathname}`, { status: 404 });
    }

    console.log(`request ${url.pathname}`);

    const params = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
        params.append(key, decodeURIComponent(value));
    }

    const response = await fetch(TENCENT_POE_SITE + url.pathname, {
        method: "POST",
        body: params,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": config.cookie,
        },
    });

    if (response.status !== 200) {
        console.error(`Error fetching data from Tencent POE site: ${response.status} ${response.statusText}`);
        return new Response(`Error fetching data from Tencent POE site: ${response.status} ${response.statusText}`, { status: 500 });
    }

    if (url.pathname === GET_ITEMS_URL || url.pathname === GET_PASSIVE_SKILLS_URL) {
        const data = await response.json();

        if (url.pathname === GET_ITEMS_URL) {
            jsonTranslator.transItems(data as GetItemsResult);
        } else if (url.pathname === GET_PASSIVE_SKILLS_URL) {
            jsonTranslator.transPassiveSkills(data as GetPassiveSkillsResult);
        }

        return new Response(JSON.stringify(data));
    }

    return new Response(await response.text());
}

console.log(`listening on ${config.hostname}:${config.port}...`);

const server = Bun.serve({
    port: config.port,
    hostname: config.hostname,
    async fetch(req) {
        return await proxy(req);
    },
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.stop();
    console.log('Server stopped.');
    process.exit(0);
});
