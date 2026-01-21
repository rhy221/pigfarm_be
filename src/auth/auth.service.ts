import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.users.findUnique({
      where: { email },
      include: {
        user_group: {
          include: {
            access_control: true
          }
        }
      },
    });

    if (!user || 
      // !(await bcrypt.compare(password, user.password_hash))
      password !== user.password_hash
    ) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản hiện đang bị khóa');
    }

    const payload = { sub: user.id, email: user.email, role: user.role_id };
    const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        roleName: user.user_group?.name,
        permissions: user.user_group?.access_control?.permissions || {},
      },
    };
  }
}