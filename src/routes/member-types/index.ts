import { changeMemberTypeBodySchema } from './schema';
import { MemberTypeEntity } from '../../utils/DB/entities/DBMemberTypes';
import { idParamSchema } from '../../utils/reusedSchemas';
import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<MemberTypeEntity[]> {
    return fastify.db.memberTypes.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity> {
      return await fastify.db.memberTypes.findOne({key: 'id', equals: request.params.id})
        .then(profile => {
          if (profile === null) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          return profile;
        });
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeMemberTypeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity> {
      if (request.params.id !== 'basic') throw fastify.httpErrors.badRequest(`👎${request.params.id}`);
      const newProfile = request.body;
      const updatedProfile = await fastify.db.memberTypes.findOne({key: 'id', equals: request.params.id})
        .then(memberType => {
          if (memberType === null) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          return { ...memberType, ...newProfile};
        });

      return fastify.db.memberTypes.change(request.params.id, updatedProfile);
    }
  );
};

export default plugin;
