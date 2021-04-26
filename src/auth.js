const validateGenerator = users => async (request, username, password, h) => {
    const user = users.find(u => u.username === username);
    if (!user) {
        return { credentials: null, isValid: false };
    }
    const isValid = password === user.password;
    const credentials = { user };
    return { isValid, credentials };
};

return module.exports = {
    validateGenerator
};
