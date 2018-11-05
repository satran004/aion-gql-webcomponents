![Built With Stencil](https://img.shields.io/badge/-Built%20With%20Stencil-16161d.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI%2BCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BCgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU%2BCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MjQuNywzNzMuOWMwLDM3LjYtNTUuMSw2OC42LTkyLjcsNjguNkgxODAuNGMtMzcuOSwwLTkyLjctMzAuNy05Mi43LTY4LjZ2LTMuNmgzMzYuOVYzNzMuOXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQyNC43LDI5Mi4xSDE4MC40Yy0zNy42LDAtOTIuNy0zMS05Mi43LTY4LjZ2LTMuNkgzMzJjMzcuNiwwLDkyLjcsMzEsOTIuNyw2OC42VjI5Mi4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI0LjcsMTQxLjdIODcuN3YtMy42YzAtMzcuNiw1NC44LTY4LjYsOTIuNy02OC42SDMzMmMzNy45LDAsOTIuNywzMC43LDkyLjcsNjguNlYxNDEuN3oiLz4KPC9zdmc%2BCg%3D%3D&colorA=16161d&style=flat-square)

## Webcomponents using AION GraphQL
[Demo](https://satran004.github.io/aion-gql-webcomponents/)

## To use: 

### Import aion-gql-webcomponents.js

```
<script src="https://unpkg.com/aion-gql-webcomponents@x.x.x/dist/aion-gql-webcomponents.js"></script>
```


### Use aion-blocks component 

```
<aion-blocks limit={limit} duration="{polling time in sec}" gql-url={graphql_endpoint}></aion-blocks>
```
Example:
```
<aion-blocks limit="8" duration="10" gql-url="https://<host>/graphql"></aion-blocks>
```

### Use aion-pay component 
A webcomponent to support payment using AION coin. A sender account can be accessed by providing private key or AION keystore file. 

If "to" property is mentioned, the payment can only be done to the mentioned address. To enable send to any address, don't provide "to" address in the tag.

Usage:

1. Default button. Pay to a given address
```
<aion-pay to="to_address" gql-url="https://<aion-gql-host>/graphql"></aion-pay>
```

2. To pay to any address, don't provide "to" property.

```
<aion-pay gql-url="https://<aion-gql-host>/graphql"></aion-pay>
```

3. With a custom text but with aion icon on the button. Pay to a given address.
```
<aion-pay to="to_address" gql-url="https://<aion-gql-host>/graphql" button-text=[custom_text]></aion-pay>
```

4. With a custom content in the pay button. It will override both default icon and text.
```
<aion-pay to="to_address" gql-url="https://<aion-gql-host>/graphql">[custom content]</aion-pay>
```

Examples:

```
<aion-pay to="0xa01112158d69a368dfebb9db63a903738cxxxxxxxxx" gql-url="http://localhost:8080/graphql"></aion-pay>
<aion-pay gql-url="http://localhost:8080/graphql"></aion-pay>
<aion-pay to="0xa01112158d69a368dfebb9db63a903738cxxxxxxxxx" gql-url="http://localhost:8080/graphql">Pay By AION</aion-pay>
```

Styles:

Aion Pay component also exposes few style variables which can be used to customize the style of the component. Example: button color, button font family etc.

```
--pay-button-color: <button_background_color>;
--pay-button-font-weight: <button font weight>;
--pay-button-font-family: <font family for the button text>;
--pay-button-font-style: <button font stye>;
```
Example:
```
<style type="text/css">
aion-pay {
  --pay-button-color: #BB86FC;
  --pay-button-font-weight: bolder;
  --pay-button-font-family: "Comic Sans MS", "Comic Sans", cursive;
  --pay-button-font-style: normal;
}
</style>

```

## Development

```
git clone https://github.com/satran004/aion-gql-webcomponents.git
```

```
npm install
```

### To run local dev server

```
npm start
```

### To Build
```
npm run build
```
