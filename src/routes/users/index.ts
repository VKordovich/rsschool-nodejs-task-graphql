import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  changeUserBodySchema,
  createUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const regExId = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (): Promise<UserEntity[]> {
    return await fastify.db.users.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request): Promise<UserEntity> {
      return await fastify.db.users.findOne({key: 'id', equals: request.params.id})
        .then(user => {
          if (!regExId.test(request.params.id)) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          if (user === null) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          return user;
        });
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request): Promise<UserEntity> {
      return await fastify.db.users.create(request.body);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request): Promise<UserEntity> {
      if (!regExId.test(request.params.id)) throw fastify.httpErrors.badRequest(`👎${request.params.id}`);
      const allParentUsers = await fastify.db.users.findMany({key: 'subscribedToUserIds', inArray: request.params.id})
      for (const parent of allParentUsers) {
        parent.subscribedToUserIds = parent.subscribedToUserIds.filter(id => id !== request.params.id);
        await fastify.db.users.change(parent.id, parent);
      }
      await fastify.db.profiles.findOne({key: 'userId', equals: request.params.id})
        .then(profile => {
          if(profile) return fastify.db.profiles.delete(profile.id);
          return profile;
        })
      await fastify.db.posts.findMany({key: 'userId', equals: request.params.id})
        .then(posts => {
          for (const post of posts) {
            if(post) return fastify.db.posts.delete(post.id);
          }
        })
      return fastify.db.users.delete(request.params.id)
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request): Promise<UserEntity> {
      const subscriberId = request.params.id;
      const parentId = request.body.userId;

      await fastify.db.users.findOne({
        key: "id",
        equals: subscriberId,
      }).then(user => {
        if(user === null) throw fastify.httpErrors.notFound(`👎${subscriberId}`);
        return user;
      });

      const updatedUser = await fastify.db.users.findOne({
        key: "id",
        equals: parentId,
      }).then(user => {
        if(user === null) throw fastify.httpErrors.notFound(`👎${parentId}`);
        if(user.subscribedToUserIds.includes(subscriberId)) throw fastify.httpErrors.badRequest(`👬`)
        user.subscribedToUserIds.push(subscriberId);
        return user;
      });

      return fastify.db.users.change(parentId, updatedUser);
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request): Promise<UserEntity> {
      const unSubscriberId = request.params.id;
      const parentId = request.body.userId;

      await fastify.db.users.findOne({
        key: "id",
        equals: unSubscriberId,
      }).then(user => {
        if(user === null) throw fastify.httpErrors.notFound(`👎${unSubscriberId}`);
        return user;
      });

      const updatedUser = await fastify.db.users.findOne({
        key: "id",
        equals: parentId,
      }).then(user => {
        if(user === null) throw fastify.httpErrors.notFound(`👎${parentId}`);
        if(!user.subscribedToUserIds.includes(unSubscriberId)) throw fastify.httpErrors.badRequest(`👬`)
        user.subscribedToUserIds = user.subscribedToUserIds.filter(id => id !== unSubscriberId);
        return user;
      });

      return fastify.db.users.change(parentId, updatedUser);
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request): Promise<UserEntity> {
      const newUserData = request.body;
      const updatedUser = await fastify.db.users.findOne({key: 'id', equals: request.params.id})
        .then(user => {
          if (!regExId.test(request.params.id)) throw fastify.httpErrors.badRequest(`👎${request.params.id}`);
          if (user === null) throw fastify.httpErrors.notFound(`👎${request.params.id}`);
          return { ...user, ...newUserData};
        });

      return fastify.db.users.change(request.params.id, updatedUser);
    }
  );
};

export default plugin;
