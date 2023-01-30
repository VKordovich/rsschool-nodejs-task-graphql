import { idParamSchema } from '../../utils/reusedSchemas';
import {
  changePostBodySchema,
  createPostBodySchema
} from './schema';
import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { PostEntity } from '../../utils/DB/entities/DBPosts';

const regExId = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (): Promise<PostEntity[]> {
    return fastify.db.posts.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request): Promise<PostEntity> {
      return await fastify.db.posts.findOne({key: 'id', equals: request.params.id})
        .then(profile => {
          if (profile === null) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          return profile;
        });
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createPostBodySchema,
      },
    },
    async function (request): Promise<PostEntity> {
      return await fastify.db.posts.create(request.body);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request): Promise<PostEntity> {
      if (!regExId.test(request.params.id)) throw fastify.httpErrors.badRequest(`👎${request.params.id}`);
      return fastify.db.posts.delete(request.params.id)
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changePostBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      if (!regExId.test(request.params.id)) throw fastify.httpErrors.badRequest(`👎${request.params.id}`);
      const newProfile = request.body;
      const updatedProfile = await fastify.db.posts.findOne({key: 'id', equals: request.params.id})
        .then(post => {
          if (post === null) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          return { ...post, ...newProfile};
        });

      return fastify.db.posts.change(request.params.id, updatedProfile);
    }
  );
};

export default plugin;
