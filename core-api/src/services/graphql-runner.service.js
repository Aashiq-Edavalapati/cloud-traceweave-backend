import { executeHttpRequest } from './http-runner.service.js';

export const executeGraphQLRequest = async (requestConfig, cookieJar) => {
    const { url, headers = {}, body } = requestConfig;
    const { query, variables } = body.graphql || {};

    // 1. Prepare Payload
    // GraphQL always needs this specific JSON structure
    let safeVariables = variables;
    if (typeof variables === 'string') {
        try {
            safeVariables = JSON.parse(variables || '{}');
        } catch (e) {
            return {
                success: false,
                status: 400,
                statusText: 'Bad Request',
                data: { error: `Invalid Variables JSON: ${e.message}` },
                timings: { total: 0 } 
            };
        }
    }

    const payload = JSON.stringify({
        query,
        variables: safeVariables
    });

    // 2. Prepare Headers
    const safeHeaders = { 
        ...headers, 
        'Content-Type': 'application/json',
        // 'Accept': 'application/json' // Good practice to add
    };

    // 3. Delegate to HTTP Runner
    // We treat this as a standard POST request now
    const httpConfig = {
        method: 'POST', // GraphQL is almost always POST
        url,
        headers: safeHeaders,
        body: {
            type: 'raw', // We've already processed it into a raw string
            raw: payload
        }
    };

    return await executeHttpRequest(httpConfig, cookieJar);
};