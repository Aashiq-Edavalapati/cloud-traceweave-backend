import { jest } from '@jest/globals';
import { substituteVariables } from '../../src/services/variableSubstitution.service.js';

describe('Variable Substitution Service', () => {
    test('should return config as is if no variables provided', () => {
        const config = { url: 'http://example.com' };
        const result = substituteVariables(config, {});
        expect(result).toEqual(config);
    });

    test('should substitute variables in URL', () => {
        const config = { url: 'http://{{domain}}/api' };
        const variables = { domain: 'example.com' };
        
        const result = substituteVariables(config, variables);
        
        expect(result.url).toBe('http://example.com/api');
    });

    test('should substitute variables in headers', () => {
        const config = { headers: { 'Authorization': 'Bearer {{token}}' } };
        const variables = { token: 'secret-token' };
        
        const result = substituteVariables(config, variables);
        
        expect(result.headers['Authorization']).toBe('Bearer secret-token');
    });

    test('should substitute variables in body (string)', () => {
        const config = { body: '{"name": "{{name}}"}' };
        const variables = { name: 'John' };
        
        const result = substituteVariables(config, variables);
        
        expect(result.body).toBe('{"name": "John"}');
    });

    test('should substitute variables in body (object)', () => {
        const config = { body: { name: '{{name}}', nested: { age: '{{age}}' } } };
        const variables = { name: 'John', age: '30' };
        
        const result = substituteVariables(config, variables);
        
        expect(result.body.name).toBe('John');
        expect(result.body.nested.age).toBe('30');
    });

    test('should substitute variables in params', () => {
        const config = { params: { query: '{{query}}' } };
        const variables = { query: 'search' };
        
        const result = substituteVariables(config, variables);
        
        expect(result.params.query).toBe('search');
    });

    test('should throw error if variable not found', () => {
        const config = { url: 'http://{{missing}}/api' };
        const variables = { existing: 'value' };
        
        expect(() => substituteVariables(config, variables)).toThrow("Variable 'missing' not found in environment");
    });
    
    test('should handle arrays', () => {
        const config = { body: { items: ['{{item1}}', '{{item2}}'] } };
        const variables = { item1: 'A', item2: 'B' };
        
        const result = substituteVariables(config, variables);
        
        expect(result.body.items).toEqual(['A', 'B']);
    });
    
     test('should handle multiple substitutions in one string', () => {
        const config = { url: 'http://{{host}}:{{port}}/api' };
        const variables = { host: 'localhost', port: '8080' };
        
        const result = substituteVariables(config, variables);
        
        expect(result.url).toBe('http://localhost:8080/api');
    });
});
