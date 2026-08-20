export function querJson(req) {
  return req.accepts(['html', 'json']) === 'json';
}

export function responder(req, res, { json, html }) {
  if (querJson(req)) return res.json(json);
  return html();
}
