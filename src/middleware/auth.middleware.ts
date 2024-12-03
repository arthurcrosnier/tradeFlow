// src/middleware/auth.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (
      req.path === '/auth/login' ||
      req.path === '/auth.html' ||
      req.path === '/login_telegram.html' ||
      req.path.endsWith('.html')
    ) {
      return next();
    }

    const token =
      req.cookies['auth_token'] || req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Non authentifié');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = jwt.verify(token, secret);
      req['user'] = decoded;
      next();
    } catch (error) {
      throw new UnauthorizedException('Token invalide');
    }
  }
}
