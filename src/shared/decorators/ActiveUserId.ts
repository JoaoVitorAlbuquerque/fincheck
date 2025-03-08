import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

export const ActiveUserId = createParamDecorator<undefined>(
  (data, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId;

    if (!request.userId) {
      throw new UnauthorizedException();
    }

    return userId;
  },
);
