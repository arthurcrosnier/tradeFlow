// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  UnauthorizedException,
  Get,
  Redirect,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(private readonly configService: ConfigService) {}

  @Post('login')
  async login(
    @Body() body: { password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD_HASH');

    const isValid = await bcrypt.compare(body.password, adminPassword);

    if (!isValid) {
      throw new UnauthorizedException('password incorrect');
    }

    const token = jwt.sign(
      { isAdmin: true },
      this.configService.get<string>('JWT_SECRET'),
      { expiresIn: '72h' },
    );

    /***
      todo: set the secure flag to true in production
    ***/
    response.cookie('auth_token', token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === 'production',
      secure: false,
      maxAge: 72 * 60 * 60 * 1000, // 72h
    });

    return { status: 'success' };
  }

  @Get()
  @Redirect('/auth.html')
  root() {
    // redirect to the login page
  }
}
