declare module "unbzip2-stream" {
  import { Transform } from "stream";

  function unbzip2(): Transform;

  export = unbzip2;
}
