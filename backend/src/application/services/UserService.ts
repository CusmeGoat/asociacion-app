import bcrypt from "bcryptjs";
import { ILike } from "typeorm";

import { AppDataSource } from "../../config/data-source";
import { RoleEntity } from "../../infrastructure/persistence/entities/RoleEntity";
import { UserEntity } from "../../infrastructure/persistence/entities/UserEntity";
import { AppError } from "../../shared/errors/AppError";
import { randomPassword } from "../../shared/security/tokens";
import { userResponse } from "../dto/responses";

export class UserService {
  private users = AppDataSource.getRepository(UserEntity);
  private roles = AppDataSource.getRepository(RoleEntity);

  async create(input: {
    nombres: string;
    apellidos: string;
    cedula?: string | null;
    email: string;
    password: string;
  }) {
    const cleanCedula = this.normalizeCedula(input.cedula);
    await this.ensureUnique(input.email, cleanCedula);
    const socioRole = await this.findRole("SOCIO");

    const user = this.users.create({
      nombres: input.nombres,
      apellidos: input.apellidos,
      cedula: cleanCedula,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      isActive: true,
      mustChangePassword: false,
      roles: [socioRole],
    });

    return userResponse(await this.users.save(user));
  }

  async list(filters: {
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const where = filters.search
      ? [
          { nombres: ILike(`%${filters.search}%`) },
          { apellidos: ILike(`%${filters.search}%`) },
          { email: ILike(`%${filters.search}%`) },
          { cedula: ILike(`%${filters.search}%`) },
        ]
      : undefined;

    let users = await this.users.find({ where, order: { createdAt: "DESC" } });

    if (filters.isActive !== undefined) {
      users = users.filter((user) => user.isActive === filters.isActive);
    }
    if (filters.role) {
      const role = filters.role.toUpperCase();
      users = users.filter((user) => user.roles.some((item) => item.name === role));
    }

    return users.map(userResponse);
  }

  async activate(id: string) {
    const user = await this.findUser(id);
    user.isActive = true;
    return userResponse(await this.users.save(user));
  }

  async deactivate(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new AppError(400, "No puedes desactivar tu propio usuario");
    }
    const user = await this.findUser(id);
    user.isActive = false;
    return userResponse(await this.users.save(user));
  }

  async changeRole(id: string, roleName: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new AppError(400, "No puedes cambiar tu propio rol");
    }
    const user = await this.findUser(id);
    user.roles = [await this.findRole(roleName.toUpperCase())];
    return userResponse(await this.users.save(user));
  }

  async generateTempPassword(id: string) {
    const user = await this.findUser(id);
    const tempPassword = randomPassword();
    user.passwordHash = await bcrypt.hash(tempPassword, 12);
    user.mustChangePassword = true;
    await this.users.save(user);
    return { temp_password: tempPassword };
  }

  private async ensureUnique(email: string, cedula?: string | null) {
    if (await this.users.findOne({ where: { email } })) {
      throw new AppError(400, "El correo ya esta registrado");
    }
    if (cedula && (await this.users.findOne({ where: { cedula } }))) {
      throw new AppError(400, "La cedula ya esta registrada");
    }
  }

  private normalizeCedula(value?: string | null) {
    return value?.toString().replace(/\D/g, "") ?? "";
  }

  private async findRole(name: string) {
    const role = await this.roles.findOne({ where: { name } });
    if (!role) {
      throw new AppError(500, `Rol ${name} no configurado`);
    }
    return role;
  }

  private async findUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }
    return user;
  }
}
