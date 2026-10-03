import { fmtData, fmtInt, fmtPrice } from './format.js';
export function canPay(s, c) {
    const r = s.res;
    if (c.research && r.research < c.research - 1e-9)
        return false;
    if (c.insight && r.insight < c.insight - 1e-9)
        return false;
    if (c.funds && r.funds < c.funds - 1e-9)
        return false;
    if (c.data && r.data < c.data - 1e-9)
        return false;
    if (c.gov && s.pol.gov < c.gov)
        return false;
    if (c.opinion && s.pol.opinion < c.opinion)
        return false;
    return true;
}
export function meets(s, q) {
    if (!q)
        return true;
    if (q.gpus !== undefined && s.res.gpus < q.gpus)
        return false;
    if (q.gov !== undefined && s.pol.gov < q.gov)
        return false;
    if (q.opinion !== undefined && s.pol.opinion < q.opinion)
        return false;
    return true;
}
export function pay(s, c) {
    const r = s.res;
    if (c.research)
        r.research -= c.research;
    if (c.insight)
        r.insight -= c.insight;
    if (c.funds)
        r.funds -= c.funds;
    if (c.data)
        r.data -= c.data;
    if (c.gov)
        s.pol.gov -= c.gov;
    if (c.opinion)
        s.pol.opinion -= c.opinion;
}
/** "60 research, $200, 3 gpus" */
export function costText(c, q) {
    const parts = [];
    if (c.research)
        parts.push(`${fmtInt(c.research)} research`);
    if (c.insight)
        parts.push(`${fmtInt(c.insight)} insight`);
    if (c.funds)
        parts.push(fmtPrice(c.funds));
    if (c.data)
        parts.push(`${fmtData(c.data)} data`);
    if (c.gov)
        parts.push(`${c.gov} gov`);
    if (c.opinion)
        parts.push(`${c.opinion} public`);
    if (q?.gpus)
        parts.push(`${fmtInt(q.gpus)} gpus`);
    if (q?.gov !== undefined)
        parts.push(`gov ≥ ${q.gov}`);
    if (q?.opinion !== undefined)
        parts.push(`public ≥ ${q.opinion}`);
    return parts.join(', ');
}
//# sourceMappingURL=cost.js.map