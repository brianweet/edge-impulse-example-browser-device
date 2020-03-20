import { ClientViews } from "./views";

export default function mobileClientLoader() {
    (window as any).client = new ClientViews();

    // tslint:disable-next-line:no-console
    console.log('Hello world from the Edge Impulse mobile client');
}
