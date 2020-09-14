"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
let D = class D {
    hello() {
        return 'hello world';
    }
};
__decorate([
    Reflect.metadata('methodName', 'hello')
], D.prototype, "hello", null);
D = __decorate([
    Reflect.metadata('className', 'D1')
], D);
const d = new D();
console.log(Reflect.getMetadata('className', D));
console.log(Reflect.getMetadata('methodName', d));
//# sourceMappingURL=test.js.map