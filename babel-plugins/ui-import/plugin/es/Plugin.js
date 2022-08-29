/*
 * @Author: yquanmei
 * @Date: 2022-08
 * @LastEditors: yquanmei
 * @LastEditTime: 2022-08
 * @FilePath: /learn-demo/babel-plugins/ui-import/plugin/es/Plugin.js
 * @Description:
 * Copyright (c) 2022 by 用户/公司名, All Rights Reserved.
 */
// 修改ast
import { join } from "path";
import { addSideEffect, addDefault } from "@babel/helper-module-imports";

function transCamelFirst(_str) {
  const str = _str[0].toLowerCase() + _str.substr(1);
  return str;
}
function transCamel(_str, symbol) {
  const str = _str[0].toLowerCase() + _str.substr(1);
  return str.replace(/([A-Z])/g, ($1) => `${symbol}${$1.toLowerCase()}`);
}
function winPath(path) {
  return path.replace(/\\/g, "/");
}

const libraryObjsArr = ["Icon"];
export default class Plugin {
  constructor({ libraryName, types }) {
    this.libraryName = libraryName;
    this.types = types;
  }
  // 获取内部状态，收集依赖
  _getPluginState(state) {
    if (!state) {
      state = {};
    }
    return state;
  }
  // 生成import语句（核心代码）
  _importMethod(methodName, file, pluginState, objectType) {
    const excludedMethodNames = ["Icon"];

    if (
      !objectType &&
      !pluginState.selectedmethods[methodName] &&
      !excludedMethodNames.includes(methodName)
    ) {
      // const exclued = ["zhCN", "Icon"];
      let transformdMethodName = methodName;
      switch (methodName) {
        case "zhCN":
          break;
        // case "Icon":
        //   transformdMethodName = transCamelFirst(methodName);
        //   break;
        default: // 组件名转换规则。如，methodName,Button，转换成button
          transformdMethodName = transCamelFirst(methodName);
          const transformdMethodNameForStyle = transCamel(methodName, "-");
          addSideEffect(
            file.path,
            `antd/es/${transformdMethodNameForStyle}/style`
          );
          break;
      }
      const libraryDirectory = "src/components";
      const path = winPath(
        join(this.libraryName, libraryDirectory, transformdMethodName)
      ); // import的组件的真实地址
      pluginState.selectedmethods[methodName] = addDefault(file.path, path, {
        nameHint: methodName,
      });
      // return { ...pluginState.selectedmethods[methodName] };
    }
    if (objectType === "Icon") {
      let realLibraryName = "@ant-design/icons";
      let transformdMethodName = methodName;
      //  const libraryDirectory = "src/components";
      const path = winPath(join(realLibraryName, transformdMethodName)); // import的组件的真实地址
      pluginState.selectedmethods[methodName] = addDefault(file.path, path, {
        nameHint: methodName,
      });
    }
    console.log(
      `%c pluginState.selectedmethods:::`,
      "background-color: pink;font-size:14px;",
      pluginState.selectedmethods
    );
    return { ...pluginState.selectedmethods[methodName] };
  }
  _handleDeclarator(node, prop, path, state) {
    // const { node } = path;
    // if (!methodName) return;
    const file = (path && path.hub && path.hub.file) || (state && state.file);
    const pluginState = this._getPluginState(state);
    // return this._importMethod(
    //   methodName,
    //   file,
    //   pluginState // PluginPass
    // );
    const types = this.types;
    const checkScope = (targetNode) =>
      pluginState.specified[targetNode.name] && // eslint-disable-line
      path.scope.hasBinding(targetNode.name) && // eslint-disable-line
      path.scope.getBinding(targetNode.name).path.type === "ImportSpecifier"; // eslint-disable-line

    if (types.isIdentifier(node[prop]) && checkScope(node[prop])) {
      node[prop] = this._importMethod(
        pluginState.specified[node[prop].name],
        file,
        pluginState
      ); // eslint-disable-line
    } else if (types.isSequenceExpression(node[prop])) {
      node[prop].expressions.forEach((expressionNode, index) => {
        if (types.isIdentifier(expressionNode) && checkScope(expressionNode)) {
          node[prop].expressions[index] = this._importMethod(
            pluginState.specified[expressionNode.name],
            file,
            pluginState
          ); // eslint-disable-line
        }
      });
    }
  }

  ProgramEnter(path, state) {
    const pluginState = this._getPluginState(state); // 收集要处理的组件，如Button
    pluginState.specified = Object.create(null);
    pluginState.selectedmethods = Object.create(null);
    pluginState.libraryObjs = Object.create(null);
    pluginState.pathsToRemove = [];
  }
  ProgramExit(path, state) {
    // 删除旧的import
    this._getPluginState(state).pathsToRemove.forEach(
      (p) => !p.removed && p.remove()
    );
  }
  // 节点的处理方法
  ImportDeclaration(path, state) {
    const { node } = path;
    if (!node) return;
    // 代码里import的包名
    const { value } = node.source; // 代码里import的包名
    const { libraryName } = this; // 配在插件options的包名
    const { types } = this; // babel-types工具函数
    const pluginState = this._getPluginState(state); // 内部状态
    // 判断是否需要使用该插件的包
    if (value === libraryName) {
      // node.specifiers表示import了什么
      node.specifiers.forEach((spec) => {
        // 判断是不是ImportSpecifier类型的节点，也就是是否是大括号的
        if (types.isImportSpecifier(spec)) {
          // 收集依赖
          // 也就是pluginState.specified.Button = Button
          // local.name是导入进来的别名，比如import {Button as MyButton} from 'antd'的MyButton
          if (libraryObjsArr.includes(spec.local.name)) {
            pluginState.libraryObjs[spec.local.name] = true;
          } else {
            pluginState.specified[spec.local.name] = spec.imported.name;
          }
        } else {
          // ImportDefaultSpecifier和ImportNamespaceSpecifier
          pluginState.libraryObjs[spec.local.name] = true;
        }
      });
      // 收集旧的依赖
      pluginState.pathsToRemove.push(path);
    }
  }
  CallExpression(path, state) {
    const { node } = path;
    const file = (path && path.hub && path.hub.file) || (state && state.file);

    // 方法调用者的 name
    const { name } = node.callee;
    // babel-type 工具函数
    const { types } = this;
    // 内部状态
    const pluginState = this._getPluginState(state);
    // console.log(`%c name:::`, "background-color: pink;font-size:14px;", name);
    // 如果方法调用者是 Identifier 类型
    if (types.isIdentifier(node.callee)) {
      if (pluginState.specified[name]) {
        console.log(
          `%c  CallExpression,node.callee:::`,
          "background-color: pink;font-size:14px;"
        );
        node.callee = this._importMethod(
          pluginState.specified[name],
          file,
          pluginState
        );
      }
    }

    // 遍历 arguments 找我们要的 specifier
    node.arguments = node.arguments.map((arg) => {
      const argName = arg?.name;
      if (
        pluginState.specified[argName] &&
        path.scope.hasBinding(argName) &&
        path.scope.getBinding(argName).path.type === "ImportSpecifier"
      ) {
        // 找到 specifier，调用 importMethod 方法
        console.log(
          `%c callExpression, node.arguments:::`,
          "background-color: pink;font-size:14px;",
          pluginState.specified[argName]
        );
        return this._importMethod(
          pluginState.specified[argName], // Button
          file,
          pluginState // PluginPass
        );
      }
      return arg;
    });
  }
  MemberExpression(path, state) {
    let node = path.node;
    const file = (path && path.hub && path.hub.file) || (state && state.file);
    const pluginState = this._getPluginState(state); // multiple instance check.
    if (!node?.object || !node?.object?.name) return;

    if (pluginState?.libraryObjs?.[node.object.name]) {
      console.log(
        `%c MemberExpression, path.replaceWith:::`,
        "background-color: pink;font-size:14px;",
        node.property.name
      );
      // antd.Button -> _Button
      path.replaceWith(
        this._importMethod(
          node.property.name,
          file,
          pluginState,
          node.object.name
        )
      );
    } else if (
      pluginState?.specified?.[node.object.name] &&
      path?.scope?.hasBinding(node.object.name)
    ) {
      const _path$scope$getBindin = path.scope.getBinding(node.object.name),
        scope = _path$scope$getBindin.scope; // global variable in file scope
      // if (node.object.name === "Icon") {
      //   // const {DownloadOutlined} = Icon =>var _DownloadOutlined2 = _interopRequireDefault(require("@ant-design/icons/DownloadOutlined"));var DownloadOutlined = _DownloadOutlined2["default"];
      //   path.replaceWith(
      //     this._importMethod(node.property.name, file, pluginState, "Icon")
      //   );
      // }
      // else
      if (scope.path.parent.type === "File") {
        // Form.Item => 找到methodName: Form => _form["default"].Item
        // const {Item: FormItem} = Form; => 找到methodName: Form => 转换成var FormItem = _form["default"].Item;
        // const {DownloadOutlined} = Icon => 找到methodName: Icon => 转换成_icon["default"].DownloadOutlined
        console.log(
          `%c MemberExpression, ndoe.object:::`,
          "background-color: pink;font-size:14px;",
          pluginState.specified[node.object.name]
        );
        node.object = this._importMethod(
          pluginState.specified[node.object.name],
          file,
          pluginState
        );
      }
    }
  }
  Property(path, state) {
    const node = path.node;
    return this._handleDeclarator(node, "value", path, state);
  }
}
