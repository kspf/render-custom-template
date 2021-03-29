#!/usr/bin/env node
 // 命令行交互
const inquirer = require('inquirer')
// 执行命令文件
var shell = require('shelljs')
// ejs模板渲染
const ejs = require('ejs')
// 目标目录
const destDir = process.cwd()
// 路径操作
const path = require('path')
// 文件操作
const fs = require('fs')
// http
const https = require('https')

/** 
 * git初始化项目
 */
function gitInit() {
  // 初始化git仓库
  if (shell.exec(`git init`).code !== 0) {
    throw Error('git init fail')
  }
  // 添加文件到git仓库
  if (shell.exec(`git add .`).code !== 0) {
    throw Error('git add fail')
  }
  // 初始化项目
  if (shell.exec(`git commit -m "init project"`).code !== 0) {
    throw Error('git init project fail')
  }

  shell.echo('项目初始化完毕');
}

/**
 * 获取模板列表
 */
function getTemplateList (){
  let reslove
  let reject

  https.get('https://kspf.github.io/render-custom-template/list.json', response => {
    let data = ''

    response.on('data', (chunk) => {
      data += chunk
    })

    response.on('end', () => {
      reslove(JSON.parse(data))
    })

  }).on("error", (err) => {
    reject(err)
  })


  return new Promise((r,j) => {
    reslove = r
    reject = j
  })
}

/**
   * 删除文件夹
   * @param {*} url
   */
 function deleteFolderRecursive(url) {
  let files = [];
  /**
   * 判断给定的路径是否存在
   */
  if (fs.existsSync(url)) {
    /**
     * 返回文件和子目录的数组
     */
    files = fs.readdirSync(url);
    files.forEach(function (file, index) {

      const curPath = path.join(url, file);
      console.log(curPath);
      /**
       * fs.statSync同步读取文件夹文件，如果是文件夹，在重复触发函数
       */
      if (fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);

      } else {
        fs.unlinkSync(curPath);
      }
    });
    /**
     * 清除文件夹
     */
    fs.rmdirSync(url);

  } else {
    console.log("给定的路径不存在，请给出正确的路径");
  }
}

/**  
 * 开始与命令行交互
 */
function cli(templateList) {

  inquirer.prompt([{
      type: 'input',
      name: 'name',
      message: 'Project name ?',
    },
    {
      type: 'input',
      name: 'version',
      message: 'What version?',
      default: '0.0.1'
    },
    {
      type: 'list',
      message: 'Please select a project template',
      name: 'template',
      choices: templateList
    }
  ]).then(answer => {
    try {
      // 拉取预设项目
      if (shell.exec(`git clone ${answer['template']} ${answer['name']}`).code !== 0) {
        throw Error('git clone fail')
      }
      // 切换到
      shell.cd(`./${answer['name']}`)

      // 删除.git文件夹
      deleteFolderRecursive(path.join(destDir, `${answer['name']}/.git`))

      //通过模板文件渲染
      ejs.renderFile(path.join(destDir, `${answer['name']}/package.json`), answer, (err, result) => {
        if (err) throw err;
        //写入目标目录
        fs.writeFileSync(path.join(destDir, `${answer['name']}/package.json`), result)

        // 项目初始化
        gitInit()
      })
    } catch (err) {
      console.error(err)
    }
  })
}

/** 
 * 入口方法
 * */ 
async function main () {
   
  try {
    const data = await getTemplateList()

    cli(data)
  }catch (err){
    throw err
  }
  
}

// 调用
main();