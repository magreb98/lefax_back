// import * as fs from 'fs';
// import { swaggerSpec } from '../swagger';

// const convertSwaggerToPostman = () => {
//     const postmanCollection = {
//         info: {
//             name: 'Lefax API',
//             schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
//         },
//         item: [] as any[]
//     };

//     const paths = swaggerSpec.paths;
    
//     for (const path in paths) {
//         const methods = paths[path];
//         for (const method in methods) {
//             const endpoint = methods[method];
//             const item = {
//                 name: endpoint.summary || path,
//                 request: {
//                     method: method.toUpperCase(),
//                     header: [],
//                     url: {
//                         raw: `{{baseUrl}}${path}`,
//                         host: ['{{baseUrl}}'],
//                         path: path.split('/').filter(Boolean)
//                     },
//                     description: endpoint.description || ''
//                 }
//             };

//             if (endpoint.security && endpoint.security.some((s: any) => s.bearerAuth)) {
//                 item.request.header.push({
//                     key: 'Authorization',
//                     value: 'Bearer {{token}}',
//                     type: 'text'
//                 });
//             }

//             if (endpoint.requestBody) {
//                 item.request.body = {
//                     mode: 'raw',
//                     raw: JSON.stringify(
//                         generateSampleRequestBody(endpoint.requestBody.content['application/json'].schema),
//                         null,
//                         2
//                     ),
//                     options: {
//                         raw: {
//                             language: 'json'
//                         }
//                     }
//                 };
//             }

//             postmanCollection.item.push(item);
//         }
//     }

//     fs.writeFileSync('postman-collection.json', JSON.stringify(postmanCollection, null, 2));
//     console.log('✅ Collection Postman générée avec succès');
// };

// const generateSampleRequestBody = (schema: any): any => {
//     if (!schema) return {};

//     if (schema.type === 'object') {
//         const result: any = {};
//         if (schema.properties) {
//             for (const prop in schema.properties) {
//                 const propSchema = schema.properties[prop];
//                 result[prop] = generateSampleValue(propSchema);
//             }
//         }
//         return result;
//     }

//     return generateSampleValue(schema);
// };

// const generateSampleValue = (schema: any): any => {
//     switch (schema.type) {
//         case 'string':
//             if (schema.format === 'email') return 'user@example.com';
//             if (schema.format === 'password') return 'password123';
//             if (schema.format === 'date-time') return new Date().toISOString();
//             if (schema.enum) return schema.enum[0];
//             return 'string';
//         case 'number':
//         case 'integer':
//             return 0;
//         case 'boolean':
//             return true;
//         case 'array':
//             return [generateSampleValue(schema.items)];
//         case 'object':
//             return generateSampleRequestBody(schema);
//         default:
//             return null;
//     }
// };

// // Exécuter le script
// convertSwaggerToPostman();