import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "roles" })
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "nombre", type: "varchar", length: 50, unique: true })
  name!: string;

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users!: UserEntity[];
}
