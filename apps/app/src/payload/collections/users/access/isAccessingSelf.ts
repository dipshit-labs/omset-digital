import type { User } from "@repo/types";

interface IsAccessingSelfParams {
  id?: string | number;
  user?: User | null;
}

const isAccessingSelf = ({ id, user }: IsAccessingSelfParams): boolean => {
  if (!(id && user?.id)) {
    return false;
  }

  return String(user.id) === String(id);
};

export { isAccessingSelf };
