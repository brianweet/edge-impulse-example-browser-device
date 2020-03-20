import { ClientViews } from "./views";

export default function mobileClientLoader() {
    (<any>window).client = new ClientViews();

    console.log('Hello world from the Edge Impulse mobile client');
}
