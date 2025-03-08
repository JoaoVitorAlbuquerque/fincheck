import { Injectable } from '@nestjs/common';
import { UsersRepository } from 'src/shared/database/repositories/users.repositories';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  getUserById(userId: string) {
    return this.usersRepo.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      },
    });
  }

  // getUserByEmail(userId: string, email: string) {
  //   return this.usersRepo.findUnique({
  //     where: { id: userId, email: email },
  //     select: {
  //       id: true,
  //       name: true,
  //       email: true,
  //     },
  //   });
  // }
}
