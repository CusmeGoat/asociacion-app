import { Entity, ManyToMany, PrimaryColumn } from "typeorm";

import { UserEntity } from "./UserEntity";

@Entity({ name: "roles" })
export class RoleEntity {
  @PrimaryColumn({ name: "nombre", type: "text" })
  name!: string;

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users!: UserEntity[];
}
