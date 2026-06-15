import { UserEntity } from "../infrastructure/persistence/entities/UserEntity";

declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
    }
  }
}
