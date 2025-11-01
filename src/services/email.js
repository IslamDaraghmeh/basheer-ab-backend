import nodemailer from 'nodemailer';
export async function sendEmail(dest,subject,message){
    let transporter = nodemailer.createTransport({
    service:'gmail',
    auth: {
        user: process.env.UserEmail,
        pass: process.env.passwordApp
    }
    });

   
    let info = await transporter.sendMail({
        from:`Insurance App <${process.env.UserEmail}$>`, 
        to: dest, 
        subject: subject, 
        html: message, 
    })

    return info
}