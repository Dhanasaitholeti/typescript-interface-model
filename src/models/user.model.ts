import { IUser } from "../libs/user";
import BaseModel from "./base/root.model";

class UserModel extends BaseModel<IUser> {
  tableName = "user";
}

export default new UserModel();
