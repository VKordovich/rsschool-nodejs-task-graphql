import { idParamSchema } from '../../utils/reusedSchemas';
import {
  changeProfileBodySchema,
  createProfileBodySchema
} from './schema';
import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { ProfileEntity } from '../../utils/DB/entities/DBProfiles';

const regExId = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (): Promise<ProfileEntity[]> {
    return fastify.db.profiles.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request): Promise<ProfileEntity> {
      return await fastify.db.profiles.findOne({key: 'id', equals: request.params.id})
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
        body: createProfileBodySchema,
      },
    },
    async function (request): Promise<ProfileEntity> {
      if (request.body.memberTypeId !== 'basic') throw fastify.httpErrors.badRequest(`👎${request.body.memberTypeId}`);
      await fastify.db.profiles.findMany().then(profiles => {
        profiles.forEach(profile => {
          if(profile.userId === request.body.userId) throw fastify.httpErrors.badRequest(`👎${request.body.userId}`);
        })
      })
      return await fastify.db.profiles.create(request.body);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      if (!regExId.test(request.params.id)) throw fastify.httpErrors.badRequest(`👎${request.params.id}`);
      await fastify.db.profiles.findOne({key: 'id', equals: request.params.id})
        .then(profile => {
          if(!profile) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
        })
      return fastify.db.profiles.delete(request.params.id)
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeProfileBodySchema,
        params: idParamSchema,
      },
    },
    async function (request): Promise<ProfileEntity> {
      if (!regExId.test(request.params.id)) throw fastify.httpErrors.badRequest(`👎${request.params.id}`);
      const newProfile = request.body;
      const updatedProfile = await fastify.db.profiles.findOne({key: 'id', equals: request.params.id})
        .then(profile => {
          if (profile === null) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          return { ...profile, ...newProfile};
        });

      return fastify.db.profiles.change(request.params.id, updatedProfile);
    }
  );
};

export default plugin;
