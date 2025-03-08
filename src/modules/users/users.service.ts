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
<<<<<<< HEAD

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
=======
>>>>>>> c6d1f2aa1f9a697bf3db1397c23395563b1f7dfb
}
