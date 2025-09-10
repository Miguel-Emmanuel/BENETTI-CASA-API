import {inject} from '@loopback/core';
import {
  Request,
  RestBindings,
  get,
  response,
  ResponseObject,
} from '@loopback/rest';

/**
 * OpenAPI response for ping()
 */
const PING_RESPONSE: ResponseObject = {
  description: 'Ping Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        title: 'PingResponse',
        properties: {
          greeting: {type: 'string'},
          date: {type: 'string'},
          url: {type: 'string'},
          headers: {
            type: 'object',
            properties: {
              'Content-Type': {type: 'string'},
            },
            additionalProperties: true,
          },
        },
      },
    },
  },
};

/**
 * A simple controller to bounce back http requests
 */
export class PingController {
  constructor(@inject(RestBindings.Http.REQUEST) private req: Request) {}

  // Map to `GET /ping`
  @get('/ping')
  @response(200, PING_RESPONSE)
  ping(): object {
    // Reply with a greeting, the current time, the url, and request headers
    return {
      greeting: 'Hello from LoopBack',
      date: new Date(),
      url: this.req.url,
      headers: Object.assign({}, this.req.headers),
    };
  }

  // Map to `GET /test`
  @get('/test')
  @response(200, {
    description: 'Test Response without DB',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            message: {type: 'string'},
            timestamp: {type: 'string'},
          },
        },
      },
    },
  })
  test(): object {
    return {
      status: 'SUCCESS',
      message: 'Casa Benetti API is running without seeders!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
