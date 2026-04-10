import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtUser } from "../guards/jwt.strategy.type";

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    return request.user;
  }
);
