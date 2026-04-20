import { Controller, Post, Get, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  register(@Body() body: { email: string; password: string; nome: string; role?: string }, @Request() req) {
    return this.authService.register(body.email, body.password, body.nome, body.role, req.user.role);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Request() req) {
    return this.authService.me(req.user.userId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(@Request() req, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
  }

  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
