
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function uuidv1() {
    return uuidv4(); // Fallback to v4 for tests if v1 requested
}

module.exports = {
    v4: uuidv4,
    v1: uuidv1,
    validate: () => true,
    NIL: '00000000-0000-0000-0000-000000000000'
};
