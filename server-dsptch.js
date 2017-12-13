exports.dispatch = (request, response, action, succ, fail) => {
    succ(response, "WS->" + action, 'text/plain');
};